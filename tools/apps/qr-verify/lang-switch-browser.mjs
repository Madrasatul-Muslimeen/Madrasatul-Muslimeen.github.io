// Audit part 47 (PCF MSA J29, rule stu123): every SHARED part follows an IN-PLACE language switch on the BUILT QuranRevival app.
// quranrevival.html is the one page that switches language WITHOUT a reload (Home -> Language -> applyAppLangChange()), so
// anything a shared script painted once (a menu, the Notes pane's bar, a Bookmark popover, the Āyah and Word cards, a toast)
// keeps the old language unless it repaints on onAppLangChange. This suite opens each part in one language, switches to the
// other IN PLACE (a marker on window proves the page did not reload) and reads the visible text and the aria-label / title /
// placeholder / alt of everything on screen, in the page and in every frame inside it. Any letter of the old script is a finding:
//   after bn -> en: any Bangla letter;  after en -> bn: an English word of 3+ letters that is not a proper name.
//   control    the detectors find a seeded Bangla string on an English page and an English one on a Bangla page, in text AND in each attribute
//   menus      Home (Settings, Language, Card look), Bookmark (list)   notes   the Notes pane + the Mapping My Journey window
//   bookmark   the 🔖 popover   cards   Āyah card, Word card   zab   the Zab bar and panel
//   node tools/apps/qr-verify/lang-switch-browser.mjs [--only=<flow>] [--width=N] [--lang=en|bn] [--signedout] [--mutate=<name>] [--probe]
//   (serves build/qr itself on PORT, default 8114: run  node tools/apps/build-app.mjs qr  first)
import "./_root.mjs"; // ported: runs against the built QR app (see _root.mjs)
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const MUTATE = arg("mutate"), ONLY = arg("only"), WONLY = Number(arg("width")) || 0, LONLY = arg("lang");
const PROBE = process.argv.includes("--probe"), SIGNEDOUT_ONLY = process.argv.includes("--signedout");
const { REPO, BUILD } = await import("./_root.mjs");
const PORT = Number(process.env.PORT) || 8114;
const server = spawn(process.execPath, ["tools/apps/serve-app.mjs", BUILD], { cwd: REPO, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
process.env.QR_BASE = `http://localhost:${PORT}`;
const { chromium, newContext, openPage, clickReadTool, BASE } = await import("../../i18n-verify/harness.mjs");
const { stubFor } = await import("../../i18n-verify/firebase-stub.mjs");

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
// Findings in QR-only files (app/quranrevival.html, apps/qr/**) belong to the MSA-QR-LEAD: listed, not failed; a listed finding
// that STOPS occurring is itself reported. id -> a pattern the leftover string matches.
//   unitLabel  the Notes pane (and the page inside it) is handed its "2:255" label by quranrevival.html when it opens, and the page does not
//              hand it a fresh one on a switch: "Notes on ২:২৫৫" / "Back to ২:২৫৫" keep the old script's digits (bn -> en), and the ASCII
//              digits in bn (en -> bn, not seen by the Bangla-letter detector). Fix: applyAppLangChange() calls setReadNotePaneUnit() with the new label.
//   ayahCard   the Āyah card is drawn by renderAyahActionSheetNow() in quranrevival.html and applyAppLangChange() does not redraw it: every
//              label, ladder rung, Approach dot title and the reference stay in the old language. Fix: redraw it there when #ayahActionSheetOverlay is open.
const FOR_QR_LEAD = { unitLabel: /(Notes on|Back to|New note on|No notes on|Find a note to attach to) [২-৯০১]/ };
const AYAH_CARD_LEAD = { ayahCard: /^page / };
//   bmUnits    the Bookmark popover's unit buttons (This āyah, This page...) and the people's names are handed to it as words by
//              quranrevival.html's toggleAyahBookmark(), in the language of the moment it opened: after bn -> en they stay Bangla
//              (en -> bn, translateStatic() catches the English ones). Fix: pass `label` and `name` as functions; the popover
//              accepts both since audit 47 (flow popfn proves it).
const BM_LEAD = { ...FOR_QR_LEAD, bmUnits: /^page (button|span\.who-name) \[text\]|^page select \[selected\]/ }; // the names: the ticked list and the "For" picker
const seenKnown = new Set();

// name: [file in the built app, route glob, anchor (exactly once), replacement]. Each puts one fix back to the old code.
// translateStatic() already turns ENGLISH text nodes into Bangla on en -> bn, so langpop and langtray are caught bn -> en:
//   node tools/apps/qr-verify/lang-switch-browser.mjs --mutate=langpop --only=bookmark --width=1280 --lang=bn   (langtray: --only=typing)
//   langmin --only=chip, langpane --only=notes, langtoast --only=toast, langedittray --only=typing: --lang=en
const MUTATIONS = {
  langpop: ["app/js/bookmark-popover.js", "**/app/js/bookmark-popover.js*", "fresh.innerHTML = rebuild();", "return;"],
  langtray: ["app/js/journey-tray.js", "**/app/js/journey-tray.js*", "onAppLangChange(relabel); // audit 47 langtray", ""],
  langmin: ["app/js/minimise.js", "**/app/js/minimise.js*", "onAppLangChange(relabel); // audit 47 langmin", ""],
  langpane: ["app/js/read-note-pane.js", "**/app/js/read-note-pane.js*", "onAppLangChange(relabel); // audit 47 langpane", ""],
  langlive: ["app/js/bookmark-popover.js", "**/app/js/bookmark-popover.js*", "const live = (x) => (typeof x === \"function\" ? x() : x);", "const live = ((memo) => (x) => (typeof x === \"function\" ? (memo.has(x) || memo.set(x, x()), memo.get(x)) : x))(new Map());"],
  langtoast: ["app/js/bookmark-popover.js", "**/app/js/bookmark-popover.js*", "if (!noticeFollows) { noticeFollows = true; onAppLangChange(() => noticeRepaint?.()); }", ""],
  // the Builder's first version: the window's page reloaded under a Note being typed
  langedittray: ["app/js/journey-tray.js", "**/app/js/journey-tray.js*", "if (editing) return; // audit 47 langedit", ""],
};
if (MUTATE && !MUTATIONS[MUTATE]) throw new Error(`no such mutation ${MUTATE}`);
const browser = await chromium.launch();

const BN = /[ঀ-৿]/;
const PROPER = /QuranRevival|QR|MMSA|MSA|Qur'?an|Asma|Husna|Madrasatul|Muslimeen|Hadith|Mapping My Journey|Google|Zab|Baqara|Bismillah|Ahsan|Study|Gmail|smahk9|com|test|Owner|Prime|Dua|Seerah|CSV|JSON|ID|My spot|Maryam|Ayatul|Kursi|Ctrl|Shift/g;
const englishLeft = (text) => (String(text).replace(/\S+@\S+/g, " ").replace(PROPER, " ").match(/[A-Za-z]{3,}/g) || []);
const settle = (p, ms = 350) => p.waitForTimeout(ms);
const ev = (p, f, a) => p.evaluate(f, a);
const visible = (p, sel) => ev(p, (s) => [...document.querySelectorAll(s)].some((e) => { const b = e.getBoundingClientRect(), c = getComputedStyle(e); return b.width > 0 && b.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]"); }), sel);
async function until(name, fn, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await new Promise((r) => setTimeout(r, 120)); }
  console.log(`  TIMEOUT  waiting for: ${name}`);
  return false;
}

// ---- in the page: everything a reader (or a screen reader) is given right now, as [kind, string, where] ------------------------
function readout(scope) {
  const root = scope ? document.querySelector(scope) : document.body;
  if (!root) return [];
  const out = [];
  const where = (e) => (e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/)[0] : "")).slice(0, 60);
  const folded = (e) => { for (let d = e.closest("details"); d; d = d.parentElement && d.parentElement.closest("details")) { if (!d.open && !(e.closest("summary") && e.closest("summary").parentElement === d)) return true; } return false; };
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return (r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest("[hidden]") && !folded(e)); };
  // The Qur'an's own text, its translations and the reader's own data are CONTENT, not interface: not read here.
  // (A card that sits INSIDE the Read view is read: only content between the card and its scope is skipped.)
  const CONTENT = "script, style, svg, canvas, option, #readView, #readScroll, .mushaf, [data-word-occurrence], .ayah-sheet-ar, .ayah-sheet-tr, [data-content], [lang=ar], .note-card-title, .word-card-gloss-segment, .word-card-learnnext-line, .word-card-meaning, .note-pane-title, [data-pane-body]";
  const notInterface = (e) => { const c = e.closest(CONTENT); return !!c && !c.contains(root); };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const s = n.nodeValue.replace(/\s+/g, " ").trim(); if (!s) continue;
    const e = n.parentElement; if (!e || notInterface(e) || !vis(e)) continue;
    out.push(["text", s, where(e)]);
  }
  for (const sel of root.querySelectorAll("select:not(#navAppLangSelect)")) { // the Language box names each language in its own script, by design
    if (!vis(sel)) continue;
    const o = sel.options[sel.selectedIndex]; if (o && o.textContent.trim()) out.push(["selected", o.textContent.replace(/\s+/g, " ").trim(), where(sel)]);
  }
  for (const e of [root, ...root.querySelectorAll("[aria-label], [title], [placeholder], [alt]")]) {
    if (!e.matches("[aria-label], [title], [placeholder], [alt]")) continue;
    if (notInterface(e) || !vis(e)) continue;
    for (const a of ["aria-label", "title", "placeholder", "alt"]) { const v = (e.getAttribute(a) || "").replace(/\s+/g, " ").trim(); if (v) out.push([a, v, where(e)]); }
  }
  return out;
}
const READOUT_SRC = readout.toString();
/** The readout of the page and of every frame inside it (the Notes pane and the Mapping My Journey window are frames). */
async function readAll(p, scope = null) {
  const all = [];
  for (const f of p.frames()) {
    const rows = await f.evaluate(`(${READOUT_SRC})(${JSON.stringify(f === p.mainFrame() ? scope : null)})`).catch(() => null);
    if (!rows) continue;
    const label = f === p.mainFrame() ? "page" : "frame:" + f.url().replace(/^.*\/app\//, "").slice(0, 28);
    for (const r of rows) all.push({ frame: label, kind: r[0], s: r[1], at: r[2] });
  }
  return all;
}
const leftover = (rows, toLang) => rows.filter((r) => (toLang === "en" ? BN.test(r.s) : englishLeft(r.s).length > 0));
const show = (r) => `${r.frame} ${r.at} [${r.kind}] "${r.s.slice(0, 50)}"`;

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

const own = { tenantId: "t1", ownerPersonId: "p2", ownerUid: "test-uid", schemaVersion: 1, createdAt: TS, updatedAt: TS, createdBy: "test-uid" };
const NOTE_SEED = `DATA.notes = [{ _id: "t1__n255", noteId: "n255", ...${JSON.stringify(own)}, title: "Started on 2:255", bodyHtml: "<p>The Throne verse.</p>", status: "active", visibility: "private", currentRevisionId: "n255-r1" }];
DATA.noteSources = [{ _id: "t1__sn255", sourceLinkId: "sn255", ...${JSON.stringify(own)}, noteId: "n255", sourceKey: "ayah:2:255", sourceKind: "quran-unit", relationshipKind: "origin", approachId: null, provenanceKind: "study-note", status: "active" }];
DATA.noteRevisions = [{ _id: "t1__n255-r1", revisionId: "n255-r1", noteId: "n255", previousRevisionId: null, title: "Started on 2:255", bodyHtml: "<p>The Throne verse.</p>", revisionReason: "content-update", actorUid: "test-uid", ...${JSON.stringify(own)} }];`;
async function open(lang, width, height, pagePath, { signedOut = false, note = false } = {}) {
  const ctx = await newContext(browser, { appLang: lang === "bn" ? "bn" : null, banner: false, viewport: { width, height } });
  const body = studentStub(stubFor({ banner: false, extraSeedJs: SEED + (note ? "\n" + NOTE_SEED : "") }), { signedOut });
  await ctx.route("https://www.gstatic.com/firebasejs/**", (r) => r.fulfill({ status: 200, contentType: "text/javascript; charset=utf-8", body }));
  await ctx.route((u) => ![new URL(BASE).hostname, "www.gstatic.com", "cdn.jsdelivr.net"].includes(u.hostname), (r) => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem("mm_card_look", "night"); } catch { /* */ } });
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
async function flow(name, lang, width, fn, opts = {}) {
  if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) return;
  const height = width < 600 ? 844 : 720;
  const tag = `${lang}->${lang === "bn" ? "en" : "bn"} ${width}x${height} ${opts.signedOut ? "signed-out " : ""}${name}`;
  let ctx;
  try {
    const o = await Promise.race([open(lang, width, height, "/app/quranrevival.html", opts), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT opening the page")), 45000))]);
    ctx = o.ctx;
    await Promise.race([fn(tag, o.page, o.errors, lang), new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT in the flow")), 120000))]);
  } catch (e) { check(`${tag}: flow ran`, false, String(e.stack || e).split("\n").slice(0, 3).join(" | ")); }
  if (ctx) await Promise.race([ctx.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))]);
}

/** Switch the language IN PLACE the way Home -> Language does, and wait for the page's own words to change. */
async function switchInPlace(p, to) {
  await ev(p, () => { window.__noReload = "kept"; });
  const before = await p.textContent("details.nav-cat-home > summary");
  await ev(p, (l) => { const s = document.getElementById("navAppLangSelect"); s.value = l; s.dispatchEvent(new Event("change", { bubbles: true })); }, to);
  const changed = await until("the page's words change", async () => (await p.textContent("details.nav-cat-home > summary")) !== before, 15000);
  await settle(p, 1500); // the catalogue loads on a first switch to Bangla, then every listener repaints
  const kept = await ev(p, () => window.__noReload === "kept").catch(() => false);
  return { changed, kept };
}
/** Judge one state after the switch. */
async function judge(t, p, label, to, mustSee, scope = mustSee, known_ = FOR_QR_LEAD) {
  const tt = `${t}: ${label}`;
  if (mustSee) { const seen = await visible(p, mustSee); check(`${tt}: POSITIVE CONTROL it is still on screen (${mustSee})`, seen); if (!seen) return; }
  const rows = await readAll(p, scope);
  check(`${tt}: ${rows.length} strings were read (page + frames)`, rows.length >= 2, String(rows.length));
  const left = leftover(rows, to);
  const known = left.filter((r) => Object.entries(known_).some(([id, re]) => re.test(show(r)) && seenKnown.add(id)));
  const mine = left.filter((r) => !known.includes(r));
  if (PROBE) console.log(`  PROBE ${tt}: ${rows.length} read, ${left.length} left over\n        ` + left.map(show).slice(0, 25).join("\n        "));
  check(`${tt}: nothing of the old language is left on screen after the switch`, mine.length === 0, `${mine.length} left: ` + mine.slice(0, 8).map(show).join(" | "));
}
async function homeOpen(p) {
  await p.click("details.nav-cat-home > summary"); await settle(p, 300);
  await until("Language in Home", async () => visible(p, "#navAppLangSelect"), 8000);
}
async function readAyah(p, surah = "2", ayah = "255") {
  if (!(await ev(p, () => document.getElementById("tabReadBtn")?.getBoundingClientRect().width > 0))) { await p.click("#tabStudyBtn"); await settle(p, 200); }
  await p.click("#tabReadBtn"); await settle(p, 400);
  await ev(p, (s) => { const e = document.getElementById("surahSelect"); if (e.value !== s) { e.value = s; e.dispatchEvent(new Event("change", { bubbles: true })); } }, surah);
  await p.waitForFunction((sn) => document.querySelector(`#readView [data-word-occurrence^="quran-word-occurrence:v1:${sn}:"]`), surah, { timeout: 15000 });
  await ev(p, (a) => { const e = document.getElementById("ayahSelect"); e.value = a; e.dispatchEvent(new Event("change", { bubbles: true })); }, ayah);
  await settle(p, 900);
  await p.evaluate(() => document.querySelectorAll('[id*="splash"], .app-splash-overlay').forEach((e) => e.remove()));
}
const notesFrame = (p) => p.frames().find((x) => /journey-map\.html\?embed=1&unit=/.test(x.url()));

// ---- the flows --------------------------------------------------------------------------------------------------------------
const OTHER = (l) => (l === "bn" ? "en" : "bn");
const signedOutOf = (t) => /signed-out/.test(t);
async function menus(t, p, errors, lang) {
  const to = OTHER(lang), signedOut = signedOutOf(t);
  await homeOpen(p);
  check(`${t}: POSITIVE CONTROL Home is open and lists Language`, await visible(p, "#navAppLangSelect"));
  const r = await switchInPlace(p, to);
  // Signed out, the page has no account to save the choice to and RELOADS (nothing to repaint); signed in it switches in place.
  check(`${t}: POSITIVE CONTROL the switch ${signedOut ? "changed the words" : "happened IN PLACE (no reload)"}`, r.changed && (signedOut || r.kept), JSON.stringify(r));
  if (signedOut && !(await visible(p, "details.nav-cat-home[open]"))) await homeOpen(p); // the page reloaded: Home starts folded
  await judge(t, p, "Home menu (Settings, Language, Card look)", to, "details.nav-cat-home[open]", "details.nav-cat-home");
  if (await visible(p, "details.nav-cat-bookmark > summary")) {
    await p.click("details.nav-cat-bookmark > summary"); await settle(p, 500);
    await judge(t, p, "Bookmark menu", to, "details.nav-cat-bookmark[open]", "details.nav-cat-bookmark");
  } else check(`${t}: the Bookmark menu is not offered signed out (nothing to repaint)`, !!signedOut);
}
async function notes(t, p, errors, lang) {
  const to = OTHER(lang);
  await readAyah(p);
  await clickReadTool(p, "#readNotesBtn");
  check(`${t}: POSITIVE CONTROL the Notes pane opens`, await until("pane", async () => { const f = notesFrame(p); return !!f && await f.locator("[data-unit-new]").count() > 0; }));
  const r = await switchInPlace(p, to);
  check(`${t}: POSITIVE CONTROL the switch happened IN PLACE`, r.changed && r.kept, JSON.stringify(r));
  await judge(t, p, "Notes pane (bar, search box, ✚ New note)", to, "#readNotePane", "#readNotePane");
  const nf = notesFrame(p);
  if (nf) {
    await until("ready", async () => nf.evaluate(() => { const b = document.querySelector("[data-unit-new]"); return !!b && !b.hasAttribute("aria-disabled") && !b.disabled; }));
    await nf.click("[data-unit-new]").catch(() => {});
    const tray = await until("the tray opens", async () => visible(p, "#journeyTray iframe"), 15000);
    if (tray) { await settle(p, 1200); await judge(t, p, "Mapping My Journey window opened from the pane", to, "#journeyTray", "#journeyTray"); }
  }
}
async function bookmark(t, p, errors, lang) {
  const to = OTHER(lang);
  await readAyah(p, "2", "256");
  await clickReadTool(p, "#readBookmarkBtn");
  check(`${t}: POSITIVE CONTROL the Bookmark popover is open`, await until("popover", async () => visible(p, ".bm-popover [data-bm-pop-save]")));
  await switchInPlace(p, to);
  await judge(t, p, "Bookmark popover (you tag, Save)", to, ".bm-popover", ".bm-popover-overlay", BM_LEAD);
}
async function cards(t, p, errors, lang) {
  const to = OTHER(lang);
  await readAyah(p);
  await ev(p, () => document.querySelector('[data-ayah-num-badge="2:255"]')?.click());
  check(`${t}: POSITIVE CONTROL the Āyah card is open`, await until("ayah card", async () => visible(p, "[data-ayah-sheet] .ayah-sheet-ref")));
  await settle(p, 800);
  await switchInPlace(p, to);
  await judge(t, p, "Āyah card", to, "[data-ayah-sheet]", "#ayahActionSheetOverlay", AYAH_CARD_LEAD);
}
async function word(t, p, errors, lang) {
  const to = OTHER(lang);
  await readAyah(p);
  await ev(p, () => document.querySelector('#readView [data-word-occurrence^="quran-word-occurrence:v1:2:255:"]')?.click());
  check(`${t}: POSITIVE CONTROL the Word card is open`, await until("word card", async () => visible(p, ".quran-word-card")));
  await settle(p, 1000);
  await switchInPlace(p, to);
  await judge(t, p, "Word card", to, ".quran-word-card", ".quran-word-card");
}
/** A window minimised to its chip, then the language switched. */
async function chip(t, p, errors, lang) {
  const to = OTHER(lang);
  await readAyah(p);
  await clickReadTool(p, "#readNotesBtn");
  await until("pane", async () => visible(p, "#readNotePane .mm-min-btn"));
  await ev(p, () => document.querySelector("#readNotePane .mm-min-btn")?.click());
  check(`${t}: POSITIVE CONTROL the Notes pane is minimised to a chip`, await until("chip", async () => visible(p, '[data-mm-min-chip="notes"]')));
  await switchInPlace(p, to);
  await judge(t, p, "minimised chip and dock", to, "#mmMinDock", "#mmMinDock");
  await ev(p, () => document.querySelector('[data-mm-min-chip="notes"]')?.click());
  await settle(p, 500);
  await judge(t, p, "the Notes pane brought back from its chip", to, "#readNotePane", "#readNotePane");
}
/** The Bookmark popover opened with its unit labels and people's names as FUNCTIONS (what QR's caller should pass): every word
    follows the switch, the reader's own picks stay. */
async function popfn(t, p, errors, lang) {
  const to = OTHER(lang);
  await ev(p, async () => {
    const [m, i, pr] = await Promise.all([import("./js/bookmark-popover.js"), import("./js/i18n.js"), import("./js/prefs.js")]);
    const nm = (en, bn) => () => (pr.getAppLang() === "bn" ? bn : en);
    m.openBookmarkNamePopover({ defaultName: "2:255", folders: [], people: [{ id: "p2", name: nm("Maryam", "মারইয়াম") }], defaultPersonTagId: "p2",
      roster: [{ id: "p2", name: nm("Maryam", "মারইয়াম"), isSelf: true }, { id: "p3", name: nm("Ahsan", "আহসান") }], selectedPersonId: "p2",
      units: [{ id: "ayah", label: () => i.t("This āyah"), defaultName: "2:255" }, { id: "page", label: () => i.t("This page"), defaultName: "Page 42" }] });
  });
  check(`${t}: POSITIVE CONTROL the popover is open`, await until("popover", async () => visible(p, ".bm-popover [data-bm-pop-unit]")));
  await ev(p, () => { document.querySelector('[data-bm-pop-unit="page"]').click(); document.querySelector("[data-bm-pop-name]") && (document.querySelector("[data-bm-pop-name]").value = "My own words"); });
  await switchInPlace(p, to);
  await judge(t, p, "Bookmark popover given live labels", to, ".bm-popover", ".bm-popover-overlay");
  const kept = await ev(p, () => ({ page: document.querySelector('[data-bm-pop-unit="page"]')?.getAttribute("aria-checked"), name: document.querySelector("[data-bm-pop-name]")?.value ?? null }));
  check(`${t}: the reader's pick (This page) is kept across the switch`, kept.page === "true", JSON.stringify(kept));
  check(`${t}: the Name being typed is kept across the switch`, kept.name === null || kept.name === "My own words", JSON.stringify(kept));
}
/** A toast on screen at the moment of the switch (the "Saved for ..." notice). */
async function toast(t, p, errors, lang) {
  const to = OTHER(lang);
  await ev(p, async () => {
    const [m, i] = await Promise.all([import("./js/bookmark-popover.js"), import("./js/i18n.js")]);
    m.showBookmarkSavedNotice({ names: ["Maryam"], links: [{ href: "./bookmarks.html?person=p2&back=1", label: () => i.t("See {name}'s bookmarks", { name: "Maryam" }) }] });
  });
  check(`${t}: POSITIVE CONTROL the Saved-for notice is on screen`, await visible(p, "#bmSavedNotice:not([hidden])"));
  await switchInPlace(p, to);
  await judge(t, p, "Saved-for notice", to, "#bmSavedNotice", "#bmSavedNotice");
}
async function zab(t, p, errors, lang) {
  const to = OTHER(lang);
  // Zab shows as the bar (from 768px), the corner (phones) or a button docked in the page's own bar (where it has a slot).
  const OPENER = "#zabCorner, #zabBar [data-zab-open], .zab-dock-btn";
  check(`${t}: POSITIVE CONTROL the Zab opener is on the page`, await until("zab", async () => visible(p, OPENER)));
  await ev(p, (s) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0)?.click(), OPENER);
  check(`${t}: POSITIVE CONTROL the Zab panel is open`, await until("zab panel", async () => visible(p, "#zabPanel")));
  await until("the Language box exists", async () => ev(p, () => !!document.getElementById("navAppLangSelect")), 8000);
  await switchInPlace(p, to); // the panel stays open, as a reader's would
  // Signed out the page reloads on a switch (the panel closes with it): the bar is judged instead.
  await judge(t, p, signedOutOf(t) ? "Zab bar (after the reload)" : "Zab panel", to, signedOutOf(t) ? OPENER : "#zabPanel", "#zabRoot");
  const labels = await ev(p, () => [...document.querySelectorAll("#zabBar, #zabPanel, #zabCorner, .zab-dock-btn")].map((e) => e.getAttribute("aria-label") || ""));
  check(`${t}: the Zab bar, panel, corner and docked button speak ${to === "bn" ? "Bangla" : "English"} (aria-label)`, labels.length > 0 && labels.every((l) => to === "bn" ? BN.test(l) : !BN.test(l)), JSON.stringify(labels));
}

/** A Note being TYPED when the language is switched. A Note opened from the Notes pane opens for writing in the Mapping My
    Journey window; the switch must leave the words in that same open editor (prefs.js: a reload under someone typing is
    the worse surprise), while the pane's own page, with no Note open, follows at once. Closed and opened again, the window
    is in the new language. */
async function typing(t, p, errors, lang) {
  const to = OTHER(lang), WORDS = "typed before the switch 47";
  await readAyah(p);
  await clickReadTool(p, "#readNotesBtn");
  check(`${t}: POSITIVE CONTROL the Notes pane lists the seeded Note`, await until("pane note", async () => { const f = notesFrame(p); return !!f && await f.locator('[data-note-id="n255"]').count() > 0; }, 20000));
  const nf = notesFrame(p);
  await nf.evaluate(() => document.querySelector('[data-note-id="n255"] [data-note-open]')?.click());
  const trayFrame = () => p.frames().find((x) => /journey-map\.html\?embed=1&note=n255/.test(x.url()));
  const editBtn = (f) => f.evaluate(() => [...document.querySelectorAll("[data-pane-edit-toggle]")].find((e) => !e.hidden && e.getBoundingClientRect().width > 0)?.click() ?? "none");
  check(`${t}: POSITIVE CONTROL the Note opens in the Mapping My Journey window`, await until("the Note opens", async () => !!trayFrame() && trayFrame().evaluate(() => [...document.querySelectorAll("[data-pane-edit-toggle]")].some((e) => !e.hidden && e.getBoundingClientRect().width > 0)), 20000));
  const tf = trayFrame();
  await editBtn(tf);
  check(`${t}: POSITIVE CONTROL the Note is open for writing`, await until("editor", async () => (await tf.locator("[data-edit-body]").count()) > 0));
  await tf.click("[data-edit-body]");
  await p.keyboard.press("End");
  await p.keyboard.type(" " + WORDS);
  await tf.evaluate(() => { window.__sameDoc = "kept"; });
  await nf.evaluate(() => { window.__sameDoc = "kept"; });
  const r = await switchInPlace(p, to);
  check(`${t}: POSITIVE CONTROL the switch happened IN PLACE`, r.changed && r.kept, JSON.stringify(r));
  const inNew = (x) => (to === "bn" ? /[ঀ-৿]/.test(x) : !/[ঀ-৿]/.test(x) && /[A-Za-z]/.test(x));
  check(`${t}: the window's own bar (left open over the switch) speaks the new language`, inNew(await ev(p, () => document.querySelector("#journeyTray .jt-title")?.textContent || "")));
  check(`${t}: the window's page was NOT reloaded under the Note being typed`, await tf.evaluate(() => window.__sameDoc === "kept").catch(() => false));
  const text = await tf.evaluate(() => document.querySelector("[data-edit-body]")?.textContent ?? null).catch(() => null);
  check(`${t}: the words being typed are still in the open editor`, !!text && text.includes(WORDS), JSON.stringify(text));
  const paneAgain = await until("the pane's page is loaded again", async () => { const f = notesFrame(p); return !!f && f.evaluate(() => window.__sameDoc !== "kept" && !!document.querySelector('[data-note-id="n255"]')); }, 20000);
  check(`${t}: the Notes pane's page (no Note open in it) was loaded again in the new language`, paneAgain);
  // Done: the words are saved. Then ✕, and the Note opened again: the window is in the new language.
  await editBtn(tf);
  // (each frame runs its own copy of the Firebase stub: the window's writes are in the window's DATA)
  check(`${t}: the Note's words were saved`, await until("saved", async () => tf.evaluate((w) => JSON.stringify(window.__DATA?.noteRevisions || []).includes(w), WORDS), 15000));
  await ev(p, () => document.querySelector("#journeyTray .jt-close")?.click());
  await settle(p, 500);
  await notesFrame(p)?.evaluate(() => document.querySelector('[data-note-id="n255"] [data-note-open]')?.click());
  const back = await until("the window opens again", async () => !!trayFrame() && trayFrame().evaluate(() => window.__sameDoc !== "kept" && [...document.querySelectorAll("[data-pane-edit-toggle]")].some((e) => !e.hidden && e.getBoundingClientRect().width > 0)), 20000);
  check(`${t}: POSITIVE CONTROL the Note opens again in the window`, back);
  if (back) { await settle(p, 1200); await judge(t, p, "Mapping My Journey window opened again after the switch", to, "#journeyTray", "#journeyTray"); }
}

// ---- the detectors prove themselves -----------------------------------------------------------------------------------------
if (!ONLY || "control".includes(ONLY)) await flow("control", "en", 390, async (t, p) => {
  await ev(p, () => {
    const d = document.createElement("div");
    d.innerHTML = '<p id="s1">কুরআন পড়ুন</p><button id="s2" aria-label="সংরক্ষণ" title="সংরক্ষণ">x</button><input id="s3" placeholder="নোট খুঁজুন"><img id="s4" alt="ছবি" width="4" height="4">';
    document.body.appendChild(d);
  });
  const rows = await readAll(p);
  const left = leftover(rows, "en");
  for (const [id, kind] of [["s1", "text"], ["s2", "aria-label"], ["s2", "title"], ["s3", "placeholder"], ["s4", "alt"]]) check(`${t}: POSITIVE CONTROL a Bangla ${kind} on an English page (#${id}) is found`, left.some((r) => r.at.includes("#" + id) && r.kind === kind), JSON.stringify(left.map((r) => r.at + r.kind)));
  await ev(p, () => { document.getElementById("s1").textContent = "Save this note"; document.getElementById("s3").placeholder = "Search notes"; });
  const left2 = leftover(await readAll(p), "bn");
  check(`${t}: POSITIVE CONTROL an English text on a Bangla page is found`, left2.some((r) => r.at.includes("#s1")));
  check(`${t}: POSITIVE CONTROL an English placeholder on a Bangla page is found`, left2.some((r) => r.at.includes("#s3") && r.kind === "placeholder"));
  check(`${t}: POSITIVE CONTROL a proper name ("Mapping My Journey") is not a finding`, englishLeft("Mapping My Journey").length === 0);
  check(`${t}: POSITIVE CONTROL check() refuses a promise`, (() => { try { check("x", Promise.resolve(true)); return false; } catch { return true; } })());
});

const WIDTHS = [390, 1280].filter((w) => !WONLY || w === WONLY);
const LANGS = ["en", "bn"].filter((l) => !LONLY || l === LONLY);
for (const lang of LANGS) for (const width of WIDTHS) {
  if (!SIGNEDOUT_ONLY) {
    await flow("menus", lang, width, menus);
    await flow("notes", lang, width, notes);
    await flow("bookmark", lang, width, bookmark);
    await flow("cards", lang, width, cards);
    await flow("word", lang, width, word);
    await flow("zab", lang, width, zab);
    await flow("chip", lang, width, chip);
    await flow("toast", lang, width, toast);
    await flow("popfn", lang, width, popfn);
    await flow("typing", lang, width, typing, { note: true });
  }
  await flow("menus", lang, width, menus, { signedOut: true });
  await flow("zab", lang, width, zab, { signedOut: true });
}

if (!ONLY && !WONLY && !LONLY && !MUTATE && !PROBE) for (const id of [...Object.keys(BM_LEAD), ...Object.keys(AYAH_CARD_LEAD)]) check(`the known QR Lead finding "${id}" still occurs (else remove it from FOR_QR_LEAD: it was fixed)`, seenKnown.has(id));
await browser.close();
server.kill();
console.log(`\n==== lang-switch-browser${MUTATE ? ` [mutated: ${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
